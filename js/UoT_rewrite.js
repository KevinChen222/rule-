function operator(proxies) {
    // 只处理 ss 类型的节点
    return proxies.map(proxy => {
        if (proxy.type === 'ss') {
            return {
                ...proxy,
                'udp-over-tcp': true,
                'udp-over-tcp-version': 2
            };
        }
        return proxy;
    });
}
