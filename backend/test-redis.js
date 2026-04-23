const redisWrapper = require('./config/redisClient');

async function test() {
  await redisWrapper.redisReadyPromise;
  console.log("Redis isReady:", redisWrapper.client.isReady);
  
  if (!redisWrapper.client.isReady) {
    console.error("Redis não está pronto!");
    process.exit(1);
  }

  await redisWrapper.setAsync("test_key", "test_value");
  const val = await redisWrapper.getAsync("test_key");
  console.log("getAsync:", val);

  await redisWrapper.expireAsync("test_key", 10);
  
  await redisWrapper.hSetAsync("test_hkey", "field1", "val1");
  const hval = await redisWrapper.hGetAsync("test_hkey", "field1");
  console.log("hGetAsync:", hval);
  
  const all = await redisWrapper.hGetAllAsync("test_hkey");
  console.log("hGetAllAsync:", all);

  await redisWrapper.delAsync("test_key");
  await redisWrapper.delAsync("test_hkey");
  console.log("Testes completos");
  process.exit(0);
}

test().catch(console.error);
