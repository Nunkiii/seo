# seo

Node.js server and web interface to control a SBIG camera.

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
