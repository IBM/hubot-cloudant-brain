const path = require('path');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('sinon-chai'))
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const sinon = require('sinon');
const Hubot = require('hubot');
const Robot = Hubot.Robot;

process.env.CLOUDANT_URL = 'https://user:pass@cloudant.com';

const CloudantMock = (ur, cb) => cb(null, { db: CloudantDbMock });

const CloudantDbMock = {
  use: () => CloudantDbMock,
  list: (opts, cb) => cb(null, {
    offset: 0,
    total_rows: 2,
    rows: [ { id: 'hello', key: 'hello', value: { rev: 'rev123' }, doc: { _id: 'hello', _rev: 'rev123', value: { 'world': 'with love!' } } } ]
  }),
  bulk: (opts, cb) => {
    let results = [];
    opts.docs.forEach(doc => results.push({ _id: doc._id, _rev: doc._rev, ok: true}));
    cb(null, results)
  }
};

for(let method in CloudantDbMock) sinon.spy(CloudantDbMock, method);

proxyquire('../src/cloudant-brain.js', { 'cloudant': CloudantMock });

describe('cloudant-brain', function() {

  this.timeout(5000);

  beforeEach(function() {
    for(let method in CloudantDbMock) CloudantDbMock[method].reset();
    this.robot = new Robot(null, 'mock-adapter-v3', false, 'hubot');
    this.robot.loadFile(path.resolve('src/'), 'cloudant-brain.js');
    this.robot.run();
    sinon.spy(this.robot.logger, 'debug');
  });

  afterEach(function() {
    this.robot.shutdown();
  });


  it('exports a function', () => expect(require('../index')).to.be.a('Function'));

  it('connects to cloudant', function() {
    expect(this.robot.brain.get('hello')).to.be.eql({ 'world': 'with love!'});
  });

  it('will not actually save to cloudant without new data', function() {
    this.robot.brain.emit('save', this.robot.brain.data);
    expect(CloudantDbMock.bulk).to.have.not.been.called;
  });

  it('actually saves to cloudant with new data', function() {
    this.robot.brain.set('new key', 'new value');
    this.robot.brain.emit('save', this.robot.brain.data);
    expect(CloudantDbMock.bulk).to.have.been.calledWith({ docs: [{ _id: "new key", _rev: undefined, value: "new value" }] });
  });

  it('actually saves to cloudant with updated data', function() {
    this.robot.brain.set('hello', 'changes');
    this.robot.brain.emit('save', this.robot.brain.data);
    expect(CloudantDbMock.bulk).to.have.been.calledWith({ docs: [{ _id: "hello", _rev: "rev123", value: "changes" }] });
  });


  it('removes removed data', function() {
    this.robot.brain.set('hello', null);
    this.robot.brain.emit('save', this.robot.brain.data);
    expect(CloudantDbMock.bulk).to.have.been.calledWith({ docs: [{ _deleted: true, _id: "hello", _rev: "rev123" }] });
  });


});
