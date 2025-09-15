const crypto = require('crypto');
const payload = JSON.stringify({
  id: "evt_test_checkout",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test", mode: "subscription", customer: "cust_test", subscription: "sub_test", metadata: { userId: "1" } } },
  timestamp: Math.floor(Date.now() / 1000)
});
const signature = crypto.createHmac('sha256', 'whsec_4p5o3n2m1l0k9j8i7h6g5f4e3d2c1b9a').update(payload).digest('hex');
console.log(signature);