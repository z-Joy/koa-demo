const APIError = require('../rest').APIError;

const cwd = process.cwd();

const { exec } = require('child_process');

var gid = 0;

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
        console.log(ctx.query, 'request-query');
        console.log(ctx.request.body, 'request-body');
        ctx.rest({
            code: 200,
            module: '成功'
        });
    },
}
