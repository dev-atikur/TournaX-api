const runMiddleware = async (middlewares, req, res, router) => {
    let index = 0;

    const next = () => {
        const middleware = middlewares[index++];
        if (!middleware) return router(req, res);
        middleware(req, res, next);
    }

    next()
};


module.exports = runMiddleware;