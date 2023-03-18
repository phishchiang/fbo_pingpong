import { LoadingManager, Matrix4, PlaneGeometry, sRGBEncoding, TextureLoader, Vector3 } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export const loadingManager = new LoadingManager()

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/libs/draco/') // use a full url path


export const gltfLoader = new GLTFLoader(loadingManager)
gltfLoader.setDRACOLoader(dracoLoader)

export const textureLoader = new TextureLoader(loadingManager)

export const unitPlaneGeometry = new PlaneGeometry()

export const vector3 = new Vector3()

export const matrix4 = new Matrix4()