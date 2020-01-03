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
        const zoneList = {
            '华东':qiniu.zone.Zone_z0,
            '华北':qiniu.zone.Zone_z1,
            '华南':qiniu.zone.Zone_z2,
            '北美':qiniu.zone.Zone_na0
        }
        // 上传凭证
        const zoneKye = config.zone || '华东';
        this.config = Object.assign({
            accessKey: '1zV13Lf0Da_iTBeWsoCPRIZhBZrfbltW2t-llKpz',
            secretKey: 'RkasfN_oUo-XGbccukJl4hNIPo9btsuRbo85KRdk',
            bucket: 'yiyetest',
        },config);
        this.config.zone = zoneList[zoneKye];
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
                const { fullPath, filename} = localFile;
                uploadFilePromiseList.push(this.uploadFile(fullPath, filename))
            });
            Promise.all(uploadFilePromiseList).then(res => {
                log(chalk.green('---打包文件上传结束---'))
            }).catch(err => {})
        }) 
    }
    getFileAllPath(path){
        const fileAllpath = [];
        const getFilePath = function(path, root = '') {
            const files = fs.readdirSync(path);
            files.forEach(file => {
                const fullPath = join(path,file);
                const stats = fs.statSync(fullPath);
                if(stats.isFile()){
                    let filename = file;
                    if(root){
                      filename = `${root}/${file}`
                    }
                    fileAllpath.push({
                        fullPath,
                        filename
                    })
                }
                if(stats.isDirectory()) {
                    getFilePath(fullPath,file)
                }
            })
        }
        getFilePath(path)
        return fileAllpath
    }
    uploadFile(localFile,filename) {
        const key = filename;
        // 上传凭证
            const {accessKey,secretKey,bucket:scope} = this.config;
            const mac = new qiniu.auth.digest.Mac(accessKey,secretKey);
            const putPolicy = new qiniu.rs.PutPolicy({scope});
            const uploadToken = putPolicy.uploadToken(mac);
        //
        // 构建配置类
            const qiniuConfig = new qiniu.conf.Config();
            qiniuConfig.zone = this.config.zone;
            const formUploader = new qiniu.form_up.FormUploader(qiniuConfig);
            const putExtra = new qiniu.form_up.PutExtra();
        //
        const uploadPromise = new Promise((resolve, reject)=>{
            spinnerDiscardingStdin.text = chalk.yellow(localFile+'---文件正在上传...');
            spinnerDiscardingStdin.start();
            formUploader.putFile(uploadToken,key,localFile,putExtra, (respErr, respBody, respInfo) => {
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
                        this.deleteFile(localFile,filename).then(res => {
                            reject(respBody)
                        })
                    } else {
                        log(chalk.red(localFile+'文件上传失败'));
                    }
                  }
            })
        })
        return uploadPromise
    }
    deleteFile(localFile,filename) {
        const {accessKey,secretKey,bucket} = this.config;
        const mac = new qiniu.auth.digest.Mac(accessKey,secretKey);
        const bucketManager = new qiniu.rs.BucketManager(mac, this.config); //文件管理
        const { uploadFile } = this;
        return new Promise((resovle, reject) => {
            bucketManager.delete(bucket, filename, (err, respBody, respInfo) => {
                if (err) {
                    log('文件删除失败');
                    reject(err)
                } else {
                  log(chalk.yellow('文件删除成功,即将重新上传文件'));
                  resovle(respInfo)
                  uploadFile.call(this,localFile,filename)
                }
              }); 
        })
    }
}
module.exports = qiniuUploadPlugin
