import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';

const TOKEN = 'wechattest123';

export default async (req, res) => {
  const { method } = req;

  // 处理微信验证请求（GET）
  if (method === 'GET') {
    const { signature, timestamp, nonce, echostr } = req.query;
    const arr = [TOKEN, timestamp, nonce].sort().join('');
    const sha1 = crypto.createHash('sha1').update(arr).digest('hex');
    res.send(sha1 === signature ? echostr : '验证失败');
    return;
  }

  // 处理用户消息（POST）
  if (method === 'POST') {
    try {
      // 解析XML请求体
      const xmlData = req.body;
      const result = await parseStringPromise(xmlData, { explicitArray: false });
      const { FromUserName, ToUserName, Content, MsgType } = result.xml;

      // 仅处理文本消息
      if (MsgType === 'text') {
        const replyContent = `你发送的内容是：${Content}，大写后：${Content.toUpperCase()}`;
        // 构造XML回复
        const xmlReply = `
          <xml>
            <ToUserName><![CDATA[${FromUserName}]]></ToUserName>
            <FromUserName><![CDATA[${ToUserName}]]></FromUserName>
            <CreateTime>${Date.now()}</CreateTime>
            <MsgType><![CDATA[text]]></MsgType>
            <Content><![CDATA[${replyContent}]]></Content>
          </xml>
        `;
        res.setHeader('Content-Type', 'application/xml');
        res.send(xmlReply);
      } else {
        res.send('暂不支持非文本消息');
      }
    } catch (err) {
      console.error('处理失败：', err);
      res.status(500).send('消息处理失败');
    }
    return;
  }

  res.status(405).send('Method Not Allowed');
};
