# seo
Node.js server, web interface


    git clone https://github.com/Nunkiii/node-sbig.git
    cd node-sbig/
    npm install
    
    cd ..
    git clone https://github.com/Nunkiii/seo.git
    cd seo/
    npm install
    ln -s ../../../web/widgets/ node_modules/telescope-interface/widgets/
    ls -l node_modules/telescope-interface/widgets/
    
    cd backend/
    node ./seo.js

The entry page of the web application is

    seo/node_modules/telescope-interface/observatory.html
