// const qiniuUploadPlugin = function() {};
// qiniuUploadPlugin.prototype.apply = function(compiler) {
//     compiler.hooks.done.tap('MyPlugin', params => {
//         console.log("编译完成")
//     })
// }
// module.exports = qiniuUploadPlugin
const qiniu = require('qiniu');
const fs = require('fs');
const {join} = require('path');
const chalk = require('chalk');
const Ora = require('ora');
const spinnerDiscardingStdin = new Ora({
	text: '',
	spinner: process.argv[2]
});
const log = console.log;
class qiniuUploadPlugin {
    constructor(config) {
        //accessKey 
        //secretKey 
        //bucket
        // 上传凭证
        this.config = Object.assign({
            accessKey: '1zV13Lf0Da_iTBeWsoCPRIZhBZrfbltW2t-llKpz',
            secretKey: 'RkasfN_oUo-XGbccukJl4hNIPo9btsuRbo85KRdk',
            bucket: 'yiyetest',
            zone: qiniu.zone.Zone_z0
        },config);
        const {accessKey, secretKey,zone, bucket:scope} = this.config;
        this.bucket = scope;
        const mac = new qiniu.auth.digest.Mac(accessKey,secretKey);
        const putPolicy = new qiniu.rs.PutPolicy({scope});
        this.uploadToken = putPolicy.uploadToken(mac);
        // 构建配置类
        const qiniuConfig = new qiniu.conf.Config();
        qiniuConfig.zone  = zone;
        this.formUploader = new qiniu.form_up.FormUploader(this.config);
        this.putExtra = new qiniu.form_up.PutExtra();
    }
    apply(compiler){
        compiler.hooks.done.tapAsync('qiniuUploadPlugin', stats => {
            const { compilation } = stats;
            const { outputOptions } = compilation;
            const {path} = outputOptions;
            log(chalk.green('---打包文件开始上传---'))
            const filePaths = this.getFileAllPath(path);
            const uploadFilePromiseList = [];
            filePaths.forEach(localFile => {
                const temp = this.uploadFile(localFile);
                uploadFilePromiseList.push(temp)
            });
            Promise.all(uploadFilePromiseList).then(res => {
                log(chalk.green('---打包文件上传结束---'))
            }).catch(err => {
                log(chalk.red(`---打包文件上传结束---`))
            })
        }) 

    }
    getFileAllPath(path){
        const fileAllpath = [];
        const getFilePath = function(path) {
            const files = fs.readdirSync(path);
            files.forEach(file => {
                const fullPath = join(path,file);
                const stats = fs.statSync(fullPath);
                if(stats.isFile()){
                    fileAllpath.push(fullPath)
                }
                if(stats.isDirectory()) {
                    getFilePath(fullPath)
                }
            })
        }
        getFilePath(path)
        return fileAllpath
    }
    uploadFile(localFile) {
        const {formUploader,uploadToken,putExtra, bucket} = this;
        const uploadPromise = new Promise((resolve, reject)=>{
            spinnerDiscardingStdin.text = chalk.yellow(localFile+'---文件正在上传...');
            spinnerDiscardingStdin.start();
            formUploader.putFile(uploadToken,bucket,localFile,putExtra, (respErr, respBody, respInfo) => {
                if (respErr) {
                    throw respErr;
                  }
                  if (respInfo.statusCode == 200) {
                      // 上传成功
                      spinnerDiscardingStdin.text = chalk.green('目录'+localFile+'---文件上传成功');
                      spinnerDiscardingStdin.succeed();
                    resolve(respInfo)
                  } else {
                    // console.log(respInfo.statusCode);
                    // console.log(respBody);
                    //文件存在 respInfo.statusCode = 614
                    if(respInfo.statusCode == 614) {
                        spinnerDiscardingStdin.text = chalk.red('目录'+localFile+'---文件上传失败,文件已经存在');
                        spinnerDiscardingStdin.fail();
                        reject(respBody)
                    } else {
                        log(chalk.red(localFile+'文件上传失败'));
                    }
                  }
            })
        })
        return uploadPromise
    }
}
module.exports = qiniuUploadPlugin
