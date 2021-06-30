const APIError = require('../rest').APIError;

const cwd = process.cwd();

const { exec } = require('child_process');

const crypto = require('crypto');

var gid = 0;

const appSecret = 'BGIrPS3TYGFu-bivXnuAENN2rBhSuuMf-cTteFfLRzTIaeKqXFglbnBfH3zoK9Ce'
// const appSecret = 'dingql1n4ibvcx6qpeon'

function nextId() {
    gid ++;
    return 't' + gid;
}

function makeEncrypt(corpId){
    const msg_len = Buffer.from([0,0,0,7])//success 长度为7,二进制为00000000 00000000 00000000 00000111
    const random = crypto.randomBytes(16)//16字节的随机字符，可以不是ascii
    const msg = Buffer.from('success','ascii')
    const corpid = Buffer.from(corpId,'ascii')
    const codeStringBuffer = Buffer.concat([random,msg_len,msg,corpid])
    const key = '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@';
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

function aesDecrypt(encrypted) {
    const key = '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@';
    const iv = key.slice(0,16)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false)//如果不加这个在解密钉钉加密信息的时候final()容易出错
    let decrypted= decipher.update(encrypted, 'base64')
    decrypted= Buffer.concat([decrypted,decipher.final()])
    const content_length = decrypted.slice(16,20).readInt32BE()//正文的长度，是4个字节的整数
	return decrypted.slice(20,20+content_length).toString('utf-8')//通过指定长度提取出json
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

        // const { timestamp, nonce, msg_signature } = ctx.query;
        // const { encrypt } = ctx.request.body;
        
         //下面是返回给钉钉success
        const encrypt = makeEncrypt(appSecret)
        const timeStamp = "" + parseInt(new Date()/1000);
        const charCollection = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let nonce = '' //随机字符串，不限制长度，但是不能出现中文
        for(let i=0;i<10;i++){nonce += charCollection[Math.round(Math.random()*(charCollection.length-1))]}
        const token = 'svEkzca' //该字符串也不能出现中文，是钉钉注册回调接口时传给钉钉端的token字段
        const msg_signature = signMsg(timeStamp,nonce,encrypt,token)
        const resp = {
            msg_signature,
            timeStamp,
            nonce,
            encrypt
        }
        console.log('返回给钉钉的响应是：',resp)
        ctx.rest(JSON.stringify(resp));
    
        //下面是解密钉钉推送来的消息
        const msgFromDing = aesDecrypt(ctx.request.body.encrypt)
        console.log('钉钉发来的消息是：'+msgFromDing)
    },
}
