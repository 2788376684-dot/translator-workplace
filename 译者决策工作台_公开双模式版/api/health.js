module.exports = function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const ready=process.env.CHAT_ENABLED==='true' && !!process.env.AGNES_API_KEY;
 res.status(200).json({ready});
};
