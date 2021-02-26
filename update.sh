#! /bin/bash

cd $1

# 执行git命令脚本
git_branch=`git symbolic-ref --short -q HEAD`
echo current branch is $git_branch

# 获取最新
git pull

# 切换回原来分支
pm2 restart app
