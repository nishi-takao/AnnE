# AnnE - Annotation tool for Instance Segmentation

NISHI, Takao <nishi.t.es@osaka-u.ac.jp>

## What's this?

AnnE is an annotation tool  with a GUI for instance segmentation running on Electron.

Label editing and data saving functions have not yet been implemented.
It is still only possible to draw and edit shapes on arbitrary images.


## Installation
### Dependency

 + [Node.js](https://nodejs.org/)
   + Electron
   + @fontawesome/fontawesome-free
   + roboto-fontface


1. install node.js and npm
2. run `npm install` to install the remaining dependent libraries (electron, fontawesome-free and roboto-fontface)

```
$ cd Path/where/AnnE/downloaded
$ npm install
```


## Running
```
$ cd Path/where/AnnE/downloaded
$ ./node_modules/.bin/electron .
```


## License

BSD 2-Clause "Simplified" License

See [LICENSE](./LICENSE) for details.