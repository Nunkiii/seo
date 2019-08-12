# seo: a node.js server and web interface to control a SBIG camera.

## Install node

From:
http://yoember.com/nodejs/the-best-way-to-install-node-js/

On Linux (other OS are treated in the previous link):

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash	

    nvm list
    nvm ls-remote
    nvm install 8.9.4
    nvm use 8.9.4
    nvm alias default 8.9.4
    node -v
    npm install -g npm
    npm -v

On Mac, add the following line in `.bash_profile`:

```bash
source ~/.nvm/nvm.sh
```

## Install dependecies needed by `node-fits` and `node-sbig`. In debian-based OS:
    sudo apt install g++ libpng-dev libjpeg-dev libcfitsio-dev libusb-1.0-0-dev libsbigudrv-dev


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
