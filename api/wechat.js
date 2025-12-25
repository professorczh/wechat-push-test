// 引入依赖
import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';

// 与公众号配置的Token保持一致，不要修改
const TOKEN = 'wechattest123';

// 主函数
export default async (req, res) => {
  const { method } = req;

  // 处理微信服务器验证（GET请求）
  if (method === 'GET') {
    try {
      const { signature, timestamp, nonce, echostr } = req.query;
      // 验证签名逻辑
      const arr = [TOKEN, timestamp, nonce].sort().join('');
      const sha1 = crypto.createHash('sha1').update(arr).digest('hex');
      // 验证通过返回echostr，否则返回验证失败
      res.send(sha1 === signature ? echostr : '验证失败');
    } catch (error) {
      console.error('GET验证出错：', error);
      res.status(500).send('验证异常');
    }
    return;
  }

  // 处理用户消息推送（POST请求）
  if (method === 'POST') {
    try {
      // 解析微信发送的XML数据
      const xmlData = req.body;
      const result = await parseStringPromise(xmlData, { explicitArray: false });
      const { FromUserName, ToUserName, Content, MsgType } = result.xml;

      // 打印日志，方便在Vercel查看消息内容
      console.log('收到用户消息：', { 用户ID: FromUserName, 内容: Content, 类型: MsgType });

      // 只处理文本消息
      if (MsgType === 'text') {
        // 构造回复内容（原样返回+大写转换）
        const replyContent = `你发送的内容是：${Content}\n大写后：${Content.toUpperCase()}`;
        // 构造微信要求的XML回复格式
        const xmlReply = `
          <xml>
            <ToUserName><![CDATA[${FromUserName}]]></ToUserName>
            <FromUserName><![CDATA[${ToUserName}]]></FromUserName>
            <CreateTime>${Date.now()}</CreateTime>
            <MsgType><![CDATA[text]]></MsgType>
            <Content><![CDATA[${replyContent}]]></Content>
          </xml>
        `;
        // 设置响应头为XML格式
        res.setHeader('Content-Type', 'application/xml');
        // 发送回复
        res.send(xmlReply);
      } else {
        // 非文本消息回复提示
        res.send('暂不支持文本以外的消息类型');
      }
    } catch (error) {
      console.error('POST消息处理出错：', error);
      res.status(500).send('消息处理失败');
    }
    return;
  }

  // 不支持的请求方法
  res.status(405).send('Method Not Allowed');
};
