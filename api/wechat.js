// 引入依赖
import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';

// 与公众号配置的Token保持一致
const TOKEN = 'wechattest123';

// 主函数
export default async (req, res) => {
  // 强制设置CORS和响应头，适配微信服务器
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');

  const { method } = req;
  console.log('收到请求：', { method, url: req.url, body: req.body });

  // 处理微信服务器验证（GET请求）
  if (method === 'GET') {
    try {
      const { signature, timestamp, nonce, echostr } = req.query;
      // 验证签名逻辑
      const arr = [TOKEN, timestamp, nonce].sort().join('');
      const sha1 = crypto.createHash('sha1').update(arr).digest('hex');
      console.log('GET验证：', { sha1, signature, match: sha1 === signature });
      // 验证通过返回echostr
      res.status(200).send(sha1 === signature ? echostr : '验证失败');
    } catch (error) {
      console.error('GET验证出错：', error);
      res.status(500).send('验证异常');
    }
    return;
  }

  // 处理用户消息推送（POST请求）
  if (method === 'POST') {
    try {
      // 兼容不同的请求体格式（微信POST是XML字符串）
      let xmlData = req.body;
      if (typeof xmlData !== 'string') {
        xmlData = JSON.stringify(xmlData);
      }
      console.log('POST原始数据：', xmlData);

      // 解析XML（容错处理）
      const result = await parseStringPromise(xmlData, { 
        explicitArray: false,
        trim: true 
      });
      const xml = result.xml || {};
      console.log('解析后的XML：', xml);

      const { FromUserName, ToUserName, Content, MsgType } = xml;
      // 必须校验必填字段
      if (!FromUserName || !ToUserName || !MsgType) {
        console.error('XML字段缺失：', xml);
        res.status(200).send('<xml></xml>'); // 微信要求必须返回XML
        return;
      }

      // 只处理文本消息
      if (MsgType === 'text') {
        const replyContent = `你发送的内容是：${Content || '空消息'}\n大写后：${(Content || '空消息').toUpperCase()}`;
        // 构造标准XML回复（必须严格按微信格式）
        const xmlReply = `
          <xml>
            <ToUserName><![CDATA[${FromUserName}]]></ToUserName>
            <FromUserName><![CDATA[${ToUserName}]]></FromUserName>
            <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
            <MsgType><![CDATA[text]]></MsgType>
            <Content><![CDATA[${replyContent}]]></Content>
          </xml>
        `.replace(/\n\s+/g, ''); // 去除多余空格和换行

        console.log('回复XML：', xmlReply);
        res.status(200).send(xmlReply);
      } else {
        // 非文本消息返回空XML（微信要求必须响应）
        console.log('非文本消息：', MsgType);
        res.status(200).send('<xml><Content><![CDATA[暂不支持文本以外的消息类型]]></Content></xml>');
      }
    } catch (error) {
      console.error('POST消息处理出错：', error);
      // 即使出错，也要返回空XML，避免微信重试
      res.status(200).send('<xml></xml>');
    }
    return;
  }

  // 不支持的请求方法
  res.status(405).send('<xml><Content><![CDATA[Method Not Allowed]]></Content></xml>');
};
