const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const controller = require('./controller');

const rest = require('./rest');

const sequelize = require('./config');

const app = new Koa();

const isDev = process.env.NODE_ENV === 'dev';

const port = isDev ? 3003 : 3000;


// var Task = sequelize.define('user', {
//     id: {
//         type: Sequelize.STRING(50),
//         primaryKey: true
//     },
//     username: Sequelize.STRING(50),
//     password: Sequelize.STRING(50),
// }, {
//     timestamps: false
// });

rest.registerRest(app);


const logsUtil = require('./log.js');

// log request URL:
app.use(async (ctx, next) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    var
        start = new Date().getTime(),
        execTime;
    await next();
    execTime = new Date().getTime() - start;
    logsUtil.logResponse(ctx, execTime);	  //记录响应日志
    ctx.response.set('X-Response-Time', `${execTime}ms`);
});

// static file support:
let staticFiles = require('./static-files');
app.use(staticFiles('/static/', __dirname + '/static'));

app.use(async (ctx, next) => {
    if (ctx.url === '/') {
        return ctx.response.redirect('/static/index.html');
    }
    await next();
})

// parse request body:
app.use(bodyParser());

// bind .rest() for ctx:
app.use(rest.restify());

// add controllers:
app.use(controller());

app.listen(port);
console.log('app started at http://localhost:' + port);
