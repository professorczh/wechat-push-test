import crypto from 'crypto';

// 替换为你设置的Token
const TOKEN = 'wechattest123';

export default async (req, res) => {
  const { method } = req;

  // 1. 处理微信服务器的验证请求（GET）
  if (method === 'GET') {
    const { signature, timestamp, nonce, echostr } = req.query;
    const arr = [TOKEN, timestamp, nonce].sort().join('');
    const sha1 = crypto.createHash('sha1').update(arr).digest('hex');
    if (sha1 === signature) {
      res.send(echostr); // 验证通过，返回随机字符串
    } else {
      res.status(403).send('验证失败');
    }
  }

  // 2. 处理用户发送的消息（POST）
  if (method === 'POST') {
    const xmlData = req.body;
    // 解析XML中的用户消息（简化版，实际需用xml2js库）
    const contentMatch = xmlData.match(/<Content><!\[CDATA\[(.*?)\]\]><\/Content>/);
    const fromUserMatch = xmlData.match(/<FromUserName><!\[CDATA\[(.*?)\]\]><\/FromUserName>/);
    const toUserMatch = xmlData.match(/<ToUserName><!\[CDATA\[(.*?)\]\]><\/ToUserName>/);

    if (contentMatch && fromUserMatch && toUserMatch) {
      const userMsg = contentMatch[1];
      const fromUser = fromUserMatch[1];
      const toUser = toUserMatch[1];
      // 自定义处理逻辑：比如将用户消息转为大写
      const replyMsg = `你发送的文本处理后：${userMsg.toUpperCase()}`;
      // 构造XML回复
      const xmlReply = `
        <xml>
          <ToUserName><![CDATA[${fromUser}]]></ToUserName>
          <FromUserName><![CDATA[${toUser}]]></FromUserName>
          <CreateTime>${Date.now()}</CreateTime>
          <MsgType><![CDATA[text]]></MsgType>
          <Content><![CDATA[${replyMsg}]]></Content>
        </xml>
      `;
      res.setHeader('Content-Type', 'application/xml');
      res.send(xmlReply);
    } else {
      res.send('消息解析失败');
    }
  }
};
