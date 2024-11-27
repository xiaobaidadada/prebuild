# 添加功能:
1. `--build` 参数： 添加此参数后不在执行项目下的binding.gyp进行构建，而是用开发自己的输入的js文件或者命令来构建，可用于一些需要环境变量的构建的情况。
2. `--upload-files` 参数： 和`--upload-all`参数的区别是该参数是开发者自己指定文件，而不是默认的prebuilds目录，多个文件使用","符号分割。
3. `--upload-files-gz` 参数： 和`--upload-files`作用一样，只不过会把文件一个个压缩成tar.gz。


# Add Function:

1. `--build` parameter: When this parameter is added, the build process will skip executing the binding.gyp file in the project directory and instead use a custom JavaScript file or command provided by the developer. This is useful for situations that require specific environment variables during the build process.

2. `--upload-files` parameter: The difference between this and the `--upload-all` parameter is that this parameter allows the developer to specify the files to upload, rather than defaulting to the prebuilds directory. Multiple files should be separated by commas.

3. `--upload-files-gz` parameter: This functions the same way as the `--upload-files` parameter, except that it will compress each file into a zip before uploading.