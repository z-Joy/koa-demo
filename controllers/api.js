const APIError = require('../rest').APIError;

const cwd = process.cwd();

const { exec } = require('child_process');

// 参考：钉钉开发文档-业务事件回调 
const DingTalkEncryptor = require('dingtalk-encrypt');
const utils = require('dingtalk-encrypt/Utils');


var gid = 0;

// const appSecret = 'BGIrPS3TYGFu-bivXnuAENN2rBhSuuMf-cTteFfLRzTIaeKqXFglbnBfH3zoK9Ce'
const appSecret = 'dingql1n4ibvcx6qpeon';

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

        const { signature, timestamp, nonce } = ctx.query;
        const { encrypt } = ctx.request.body;
        /** 加解密需要，可以随机填写。如 "12345" */
        const TOKEN = '666666';
        /** 加密密钥，用于回调数据的加密，固定为43个字符，从[a-z, A-Z, 0-9]共62个字符中随机生成*/
        const ENCODING_AES_KEY = 'TXpRMU5qYzRPVEF4TWpNME5UWTNPRGt3TVRJek5EVTI';
        // const ENCODING_AES_KEY = utils.getRandomStr(43);
        /** 企业corpid, 可以在钉钉企业管理后台查看（https://oa.dingtalk.com/） */
        const CORP_ID = appSecret;
        /** 实例化加密类 */
        console.log('\nEncryptor Test:');
        const encryptor = new DingTalkEncryptor(TOKEN, ENCODING_AES_KEY, CORP_ID);

        // 解密钉钉回调数据 
        // const plainText = encryptor.getDecryptMsg(signature, timestamp, nonce, encrypt);
        // console.log('DEBUG plainText: ' + plainText);
        // const obj = JSON.parse(plainText);
        // 回调事件类型，根据事件类型和业务数据处理相应业务
        // const eventType = obj.EventType;

        // 响应数据：加密'success'，签名等等
        const res = encryptor.getEncryptedMap('success', timestamp, nonce);
        ctx.rest(JSON.stringify(res));

    },
}
