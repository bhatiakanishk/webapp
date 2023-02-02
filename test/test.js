const bcrypt = require('bcrypt');

test('bcrypt hash and compare', async () => {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare('wrong_password', hash)).toBe(false);
});
