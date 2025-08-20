// index.js
// SillyTavern 插件入口

export function initExtension() {
    console.log("[silly-phone-plugin] 插件已加载");

    // 创建一个容器
    const container = document.createElement("div");
    container.id = "silly-phone-plugin-container";
    container.style.position = "fixed";
    container.style.bottom = "10px";
    container.style.right = "10px";
    container.style.width = "360px";
    container.style.height = "740px";
    container.style.border = "1px solid #ccc";
    container.style.borderRadius = "20px";
    container.style.overflow = "hidden";
    container.style.zIndex = "9999";
    container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    container.style.backgroundColor = "white";

    // iframe 加载 src/index.html
    const iframe = document.createElement("iframe");
    iframe.src = "extensions/Phone-UI/src/index.html";  
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    container.appendChild(iframe);
    document.body.appendChild(container);
}
