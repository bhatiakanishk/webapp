'use strict'

const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../index");

chai.use(chaiHttp);
const expect = chai.expect;

describe('Health Check', () => {
    it('should return OK', (done) => {
        chai.request(app)
            .get('/healthz')
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body).to.be.equal('OK');
                done();
            });
    });
});

describe('Create User', () => {
    it('should return 400 for invalid email address', (done) => {
        chai.request(app)
            .post('/v1/account')
            .send({
                username: 'invalidemail',
                firstname: 'John',
                lastname: 'Doe',
                password: 'password'
            })
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(400);
                done();
            });
    });

    it('should create a user for valid email address', (done) => {
        chai.request(app)
            .post('/v1/account')
            .send({
                username: 'validemail@example.com',
                firstname: 'John',
                lastname: 'Doe',
                password: 'password'
            })
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('email', 'validemail@example.com');
                expect(res.body).to.have.property('firstName', 'John');
                expect(res.body).to.have.property('lastName', 'Doe');
                done();
            });
    });
});