module.exports = function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const ready=process.env.CHAT_ENABLED==='true' && !!process.env.AGNES_API_KEY && !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
 res.status(200).json({ready});
};
