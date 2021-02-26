module.exports = async function (ctx, next) {
  const req = ctx.request.body;
  if (!(req.ref || '').includes('heads/master')) {
    ctx.rest({
      code: 200,
      module: '忽略'
    });
  } else {
    await next();
  }
};