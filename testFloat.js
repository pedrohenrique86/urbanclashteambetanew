const redis = require("redis");

async function testFloat() {
  const client = redis.createClient({ url: "redis://127.0.0.1:6379" });
  await client.connect();
  
  await client.hSet("test_float", "num", "0");
  
  const pipeline = client.multi();
  pipeline.hIncrBy("test_float", "num", 0.3);
  
  try {
    const res = await pipeline.exec();
    console.log("PIPELINE RESULT:", res);
  } catch(e) {
    console.error("PIPELINE ERROR:", e);
  }
  
  const val = await client.hGet("test_float", "num");
  console.log("FINAL VAL:", val);
  process.exit(0);
}
testFloat();
