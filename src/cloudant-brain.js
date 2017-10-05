// Description:
//   hubot-cloudant-brain
//
// Configuration:
//   CLOUDANT_URL
//
// Author:
//   Rophy Tsai <tsaiyl@tw.ibm.com>

const Cloudant = require('cloudant');
const url = require('url');
const _ = require('lodash');

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

module.exports = (robot) => {

  if (!process.env.CLOUDANT_URL) throw new Error('Env var CLOUDANT_URL is required for hubot-cloudant-brain to work');

  let db = null;
  let cache = {};
  let rev = {};

  function load() {
    let match = process.env.CLOUDANT_URL.match(/^(https?:\/\/.+)\/(.+)$/);
    if (!match) throw new Error('DB name is missing in env var CLOUDANT_URL');
    let url = match[1];
    let dbname = match[2];
    
    Cloudant(url, (err, cloudant) => {
      if (err) throw err;
      db = cloudant.db.use(dbname);
      robot.logger.info('hubot-cloudant-brain: connected to db.');
      robot.brain.setAutoSave(false);
      
      let _private = {};

      function list(offset) {
        db.list({include_docs:true, skip:offset, limit:100}, (err, docs) => {
          if (err) throw err;
          // docs = {
          //   offset: 0,
          //   total_rows: 10000,
          //   rows: [ { id: 'id', key: 'id', value: { rev: 'rev' }, doc: { _id: 'id', _rev: 'rev', ... } }, ... ]
          // }
          docs.rows.forEach(doc => {
            _private[doc.id] = doc.doc.value;
            rev[doc.id] = doc.doc._rev;
          });
          offset += docs.rows.length;
          if (offset >= docs.total_rows) process(offset);
          else list(offset);
        });
      }

      function process(total) {
        cache = deepClone(_private);
        robot.brain.mergeData({_private: _private});
        robot.brain.setAutoSave(true);
        robot.brain.resetSaveInterval(30);
        robot.logger.info('hubot-cloudant-brain: loaded ' + total + ' records.');
        robot.brain.emit('connected');
      }

      list(0);
      
    });
  }

  robot.brain.on('save', (data) => {
    if (!db) return console.error('ERROR: hubot-cloudant-brain still not ready to save');
    let docs = [];
    for(let key in data._private) {
      if (!cache[key] || !_.isEqual(cache[key], data._private[key])) {
        docs.push({ _id: key, _rev: rev[key], value: data._private[key]});
      }
    }

    robot.logger.debug('hubot-cloudant-brain: ' + docs.length + ' new or updated records.');
    if (docs.length === 0) return;
    db.bulk({docs:docs}, (err, body) => {
      if (err) return console.error('ERROR: hubot-cloudant-brain failed to save data', err);
      robot.logger.debug('hubot-cloudant-brain: saved ' + body.length + ' records.');
      robot.brain.emit('saved');
    });

  
  });

  load();

}