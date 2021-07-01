const APIError = require('../rest').APIError;

const cwd = process.cwd();

const { exec } = require('child_process');
const logHandle = require('../log').logHandle;

// 参考：钉钉开发文档-业务事件回调 
const DingTalkEncryptor = require('dingtalk-encrypt');
const utils = require('dingtalk-encrypt/Utils');


var gid = 0;

const appSecret = 'dingql1n4ibvcx6qpeon';
/** 加解密需要，可以随机填写。如 "12345" */
const TOKEN = '666666';
/** 加密密钥，用于回调数据的加密，固定为43个字符，从[a-z, A-Z, 0-9]共62个字符中随机生成*/
const ENCODING_AES_KEY = 'TXpRMU5qYzRPVEF4TWpNME5UWTNPRGt3TVRJek5EVTI';
// const ENCODING_AES_KEY = utils.getRandomStr(43);
/** 企业corpid, 可以在钉钉企业管理后台查看（https://oa.dingtalk.com/） */
const CORP_ID = appSecret;

function makeEncrypt(corpId){
    const msg_len = Buffer.from([0,0,0,7])//success 长度为7,二进制为00000000 00000000 00000000 00000111
    const random = crypto.randomBytes(16) //16字节的随机字符，可以不是ascii
    const msg = Buffer.from('success','ascii')
    const corpid = Buffer.from(corpId,'ascii')
    const codeStringBuffer = Buffer.concat([random,msg_len,msg,corpid])
    // const key = 'MzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2'
    var abc = new Buffer.from(ENCODING_AES_KEY, 'base64')
    var key = abc.toString();
    const iv = key.slice(0,16)
    const cipher = crypto.createCipheriv('aes-256-cbc',key,iv)
    let encrypted = cipher.update(codeStringBuffer,'binary','base64')
    encrypted += cipher.final('base64');
    return encrypted
}

/**
 * 
 * @param {*} timeStamp 当前10位的时间戳
 * @param {*} nonce 随机字符串，长度不限
 * @param {*} encrypt 新随机字符串+二进制（0007）+ success + CorpId 然后用aes-256-cbc加密，再转为Base64字符串
 * @param {*} token 注册回调接口时设定的自定义token
 */
function signMsg(timeStamp,nonce,encrypt,token){
    let sortList = [timeStamp,nonce,encrypt,token];
    sortList.sort();
    let msg_signature = '';
    for (let text of  sortList){
        msg_signature += text;
    }
    const hash = crypto.createHash('sha1')
    hash.update(msg_signature)
    msg_signature = hash.digest('hex')
    return msg_signature
}

function getEncryptedMap(CORP_ID, timestamp, token, nonce) {
    const encrypt = makeEncrypt(CORP_ID)
    const timeStamp = String(timestamp).slice(0, 10);
    const msg_signature = signMsg(timeStamp, nonce, encrypt, token)
    const res = {
        msg_signature,
        timeStamp,
        nonce,
        encrypt
    }
}

function getDecryptMsg(encrypted) {
    var b = new Buffer.from(ENCODING_AES_KEY, 'base64')
    var key = b.toString();
    const iv = key.slice(0,16)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false)//如果不加这个在解密钉钉加密信息的时候final()容易出错
    let decrypted= decipher.update(encrypted, 'base64')
    decrypted= Buffer.concat([decrypted,decipher.final()])
    const content_length = decrypted.slice(16,20).readInt32BE()//正文的长度，是4个字节的整数
    return decrypted.slice(20,20+content_length).toString('utf-8')//通过指定长度提取出json
}

function nextId() {
    gid ++;
    return 't' + gid;
}

const model = require('../model');

let Todo = model.Todo;

var todos = [];

module.exports = {
    'GET /api/todos': async (ctx, next) => {
        let todos = await Todo.findAll({
            where: {
                userId: '1'
            }
        });
        ctx.rest({
            todos
        });
    },

    'POST /api/todos': async (ctx, next) => {
        let t = ctx.request.body;
        if (!t.name || !t.name.trim()) {
            throw new APIError('invalid_input', 'Missing name');
        }
        if (!t.description || !t.description.trim()) {
            throw new APIError('invalid_input', 'Missing description');
        };
        let todoRes = await Todo.create({
            name: t.name.trim(),
            description: t.description.trim(),
        });
        todos.push(todoRes);
        ctx.rest(todoRes);
    },

    'PUT /api/todos/:id': async (ctx, next) => {
        var t = ctx.request.body;
        if (!t.name || !t.name.trim()) {
            throw new APIError('invalid_input', 'Missing name');
        }
        if (!t.description || !t.description.trim()) {
            throw new APIError('invalid_input', 'Missing description');
        }
        var todo = await Todo.findAll({
            where: {
                id: ctx.params.id
            }
        });
        let todoItem = todo[0];
        todoItem.name = t.name.trim();
        todoItem.description = t.description.trim();
        await todoItem.save();
        ctx.rest(todoItem);
    },

    'DELETE /api/todos/:id': async (ctx, next) => {
        var todoItem = await Todo.findAll({
            where: {
                id: ctx.params.id
            }
        });
        await todoItem[0].destroy();
        ctx.rest({
            code: 200,
            module: true
        });
    },

    'POST /api/hook': async (ctx, next) => {
        // 重启本项目..
        exec('bash ' + cwd + '/shell/update.sh ' + cwd, function(err, stdout, stderr) {
            console.log(stdout);
        });
        ctx.rest({
            code: 200,
            module: '成功'
        });
    },

    'POST /api/bloghook': async (ctx, next) => {
        exec('bash ' + cwd + '/shell/blog.sh', function(err, stdout, stderr) {
            console.log(stdout);
        });
        ctx.rest({
            code: 200,
            module: '成功'
        });
    },

    'POST /api/dingtest': async (ctx, next) => {


        try {
            const { signature, timestamp, nonce } = ctx.query;
            const { encrypt } = ctx.request.body;


            /** 实例化加密类 */
            console.log('\nEncryptor Test:');
            // const encryptor = new DingTalkEncryptor(TOKEN, ENCODING_AES_KEY, CORP_ID);
    
            // 解密钉钉回调数据 
            // const plainText = encryptor.getDecryptMsg(signature, timestamp, nonce, encrypt);
            // console.log('DEBUG plainText: ' + plainText);
            const plainText = getDecryptMsg(encrypt)
            // const obj = JSON.parse(plainText);
            // 回调事件类型，根据事件类型和业务数据处理相应业务
            // const eventType = obj.EventType;

            logHandle('encrypt: ' + encrypt);
            logHandle('plainText: ' + plainText);
    
            // 响应数据：加密'success'，签名等等
            // const res = encryptor.getEncryptedMap('success', timestamp.slice(0, 10), nonce);

            const res = getEncryptedMap(CORP_ID, timestamp, TOKEN, nonce);
            
            const resStr = JSON.stringify(res);
            logHandle(resStr);
            console.log(resStr, 'resStr');
            ctx.rest(resStr);
        } catch (error) {
            logHandle('err: ' + error);
            logHandle('this is err');
        }

    },
}
