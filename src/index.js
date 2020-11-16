const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require('electron');

const path = require('path');
const os = require('os');
const slash = require('slash');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const log = require('electron-log');
const ProgressBar = require('electron-progressbar');

//setting the evironment
process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;



// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const menu = [
  {
    role: 'fileMenu'
  },
  ...[
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: createAboutWindow,
        },
      ],
    },
  ],
  ...(isDev ? [{

    label: 'Developer',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { type: 'separator' },
      { role: 'toggledevtools' },
    ],
  }
  ] : [])
]

let mainWindow;
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: 'ImageShrink',
    width: isDev ? 800 : 500,
    height: 700,
    icon: './assets/icons/ms-icon-310x310.png',
    resizable: isDev ? true : false,
    webPreferences: {
      nodeIntegration: true,
    }
  });



  // and load the index.html of the app.
  //mainWindow.loadURL('https://google.com');
  mainWindow.loadFile(path.join(__dirname, 'index.html'));


  // globalShortcut.register('f5', () => {
  //   console.log('f5 is pressed')
  //   mainWindow.reload()
  // })
  // globalShortcut.register('CmdOrCtrl+R', () => {
  //   console.log('CommandOrControl+R is pressed')
  //   mainWindow.reload()
  // })
  // globalShortcut.register('CmdOrCtrl+I', () => {
  //   console.log('CommandOrControl+I is pressed')
  //   mainWindow.webContents.toggleDevTools();
  // })

  // Open the DevTools.
  isDev ? mainWindow.webContents.openDevTools() : null;

};

function createAboutWindow() {

  const aboutWindow = new BrowserWindow({
    title: 'ImageShrink',
    width: 300,
    height: 400,
    icon: './assets/icons/ms-icon-310x310.png',
    minimizable: false,
    fullscreenable: false,
    maximizable: false,
    resizable: false,
    //movable:false
  });
  aboutWindow.setMenu(null);
  aboutWindow.loadFile(path.join(__dirname, 'about.html'));
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  mainWindow.on('ready', () => (mainWindow = null))

});


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.on('img:minimize', (e, options) => {
  options.dest = path.join(os.homedir(), 'Pictures/imageshrink');
  //console.log(options);
  shrinkImg(options);
})

async function shrinkImg({ imgPath, quality, dest }) {
  try {
    var progressBar = new ProgressBar({
      browserWindow: {
        title: 'Shrinking Image',
        text: 'Shrinking Image...',
        detail: 'Shrinking Image...',
        icon: './assets/icons/ms-icon-310x310.png',
        webPreferences: {
          nodeIntegration: true
        }
      }
    });

    progressBar
      .on('completed', function () {
        //console.info(`completed...`);
        progressBar.detail = 'Task completed. Exiting...';
      })
      .on('aborted', function () {
        //console.info(`aborted...`);
      })
      .on('progress', function() {
        progressBar.detail = `Shrinking Image...`;
      });


    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality]
        })
      ]
    });
    //console.log(files);
    //log.info(files);
    shell.openPath(dest);
    progressBar.setCompleted();
    mainWindow.webContents.send('img:done');

  } catch (error) {
    log.error(error);
    progressBar.setCompleted();
  }
}