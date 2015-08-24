import Vue from 'vue';

export default Vue.extend({
    template: `<div class="mdl-layout__content" style="width: 100%">
            <div class="mdl-grid" style='margin-top: 48px; margin-bottom: 82px; max-width: 800px;'>
                <div class="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col">
            <iframe src="https://docs.google.com/forms/d/1G9T36xrF-Gr4EqlOqKzRJvhqx1Nr6RfBgj5mxST2PBs/viewform?embedded=true" width="760" height="750" frameborder="0" marginheight="0" marginwidth="0" style="width:100%">Загрузка...</iframe>
        </div>
                </div>
            </div>
        </div>`
});

function getFlash () {
    try {
        try {
            var a = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");
            try {a.AllowScriptAccess = "always"} catch (b) {return "6,0,0"}
        } catch (c) {}
        return (new ActiveXObject("ShockwaveFlash.ShockwaveFlash")).GetVariable("$version").replace(/\D+/g, ",").match(/^,?(.+),?$/)[1]
    } catch (d) {try {if (navigator.mimeTypes["application/x-shockwave-flash"].enabledPlugin)return (navigator.plugins["Shockwave Flash 2.0"] || navigator.plugins["Shockwave Flash"]).description.replace(/\D+/g, ",").match(/^,?(.+),?$/)[1]} catch (e) {}}
    return "0,0,0"
};