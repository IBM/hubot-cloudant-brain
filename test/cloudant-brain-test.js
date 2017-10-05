const path = require('path');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('sinon-chai'))
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const sinon = require('sinon');


process.env.CLOUDANT_URL = 'https://user:pass@cloudant.com/mydb';


const CloudantMock = (ur, cb) => cb(null, { db: CloudantDbMock });

const CloudantDbMock = {
  use: () => CloudantDbMock,
  list: (opts, cb) => cb(null, {
    offset: 0,
    total_rows: 2,
    rows: [ { id: 'hello', key: 'hello', value: { rev: 'rev123' }, doc: { _id: 'hello', _rev: 'rev123', value: { 'world': 'with love!' } } } ]
  }),
  bulk: (opts, cb) => cb(null, opts.docs)
};

const Hubot = require('hubot');
const Robot = Hubot.Robot;

proxyquire('../src/cloudant-brain.js', { 'cloudant': CloudantMock });


describe('cloudant-brain', function() {

  this.timeout(5000);

  it('exports a function', () => expect(require('../index')).to.be.a('Function'));

  it('connects to cloudant', () => {
    const robot = new Robot(null, 'mock-adapter-v3', false, 'hubot');
    robot.loadFile(path.resolve('src/'), 'cloudant-brain.js');
    robot.run();
    expect(robot.brain.get('hello')).to.be.eql({ 'world': 'with love!'});
  });

  it('saves data', () => {
    const robot = new Robot(null, 'mock-adapter-v3', false, 'hubot');
    robot.loadFile(path.resolve('src/'), 'cloudant-brain.js');
    robot.run();
    sinon.spy(robot.logger, 'debug');
    robot.brain.emit('save', robot.brain.data);
    expect(robot.logger.debug).to.have.been.calledWith('hubot-cloudant-brain: 0 new or updated records.');

    robot.brain.set('new key', 'new value');
    robot.brain.emit('save', robot.brain.data);
    expect(robot.logger.debug).to.have.been.calledWith('hubot-cloudant-brain: saved 1 records.');
  });


});
