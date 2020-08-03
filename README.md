seo: a node.js server and web interface to control a SBIG camera.
============

## Install node.js
Skip if you already installed node.js on your machine.

From:
http://yoember.com/nodejs/the-best-way-to-install-node-js/

On Linux (other OS are treated in the previous link):


    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.1/install.sh | bash

    nvm ls-remote
    nvm list
    nvm install lts/dubnium
    nvm use lts/dubnium
    nvm alias default lts/dubnium
    node -v
    npm install -g npm
    npm -v
    source ~/.nvm/nvm.sh


## Install dependecies needed by `node-fits` and `node-sbig`. In debian-based OS:

    sudo apt install g++ libpng-dev libcfitsio-dev libjpeg9-dev libusb-1.0-0-dev libsbig


## Install this package

    # Cloning and installing dependencies
    git clone https://github.com/Nunkiii/seo.git
    cd seo/
    npm install

    # Linking the widgets of the module telescope-interface
    ln -s ../../../web/widgets/ node_modules/telescope-interface/widgets/
    ls -l node_modules/telescope-interface/widgets/
    
    # Launching the server
    cd backend/
    node ./seo.js

The entry page of the web application is

    seo/node_modules/telescope-interface/observatory.html
