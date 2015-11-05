source ~/git/nvm/nvm.sh
nvm use 0.12.2
hexo migrate github-issue Yikun/yikun.github.com
hexo g
cd public
git add .
git commit -am "Update blog."
git push origin master
