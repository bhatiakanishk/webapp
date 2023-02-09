const assert = require('assert');
const { Sequelize } = require('sequelize');

describe('Test database connection', () => {
    it('should connect to the user table in the database', (done) => {
        this.timeout(5000);
        const sequelize = new Sequelize('userDB', 'root', 'password', {
            host: 'localhost',
            dialect: 'mysql',
            port: '3306'
        });

        sequelize.authenticate()
            .then(() => {
                assert.ok(true);
                done();
            })
            .catch((error) => {
                assert.fail(error);
                done();
            });
    });
});
