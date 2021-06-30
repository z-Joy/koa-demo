module.exports = async function (ctx, next) {
  const req = ctx.request.body;
  console.log(req.ref, 'req.ref');
  if ((req.ref || '').includes('heads/master')) {
    ctx.rest({
      code: 200,
      module: '忽略'
    });
  } else {
    await next();
  }
};