const request = require("supertest");
const app = require("../index");
const chai = require("chai");
const expect = chai.expect;

describe("Email validation test", () => {
    it("should return 400 for invalid email address", async () => {
        const res = await request(app)
            .post("/v1/account")
            .send({
                username: "invalidemail",
                firstname: "John",
                lastname: "Doe",
                password: "password"
            });
        expect(res.statusCode).to.equal(400);
    });
});
