import frag from './walk.frag';
import simFrag from './sim.frag';
import Shader from './Shader';


export default class GPUProcessing {
    constructor({ canvas, consts, uniforms, simulationUniforms, vox }) {
        this.consts = consts;
        this.uniforms = uniforms;
        this.simulationUniforms = simulationUniforms;
        this.vox = vox;
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');
        this.timestep = 0;
    }

    load() {
        this.renderingShader = new Shader({
            glContext: this.gl,
            frag,
            consts: this.consts,
            uniforms: this.uniforms,
            sampler2d: {
                name: 'vox',
                data: this.vox,
                sizeX: this.consts.sx,
                sizeY: this.consts.sy * this.consts.sz,
            },
            drawingToScreen: true,
        });

        this.simulatingShader = new Shader({
            glContext: this.gl,
            frag: simFrag,
            consts: this.consts,
            uniforms: this.simulationUniforms,
            sampler2d: {
                name: 'vox',
                data: this.vox,
                sizeX: this.consts.sx,
                sizeY: this.consts.sy * this.consts.sz,
            },
            drawingToScreen: false,
        });


        [ this.simulatingShader.framebuffer, this.renderingShader.framebuffer ] = [ this.renderingShader.framebuffer, this.simulatingShader.framebuffer ];

    }

    render() {
        for (let i = 0; i < 5; i += 1) {
            this.simulatingShader.set({ timestep: this.timestep });
            this.simulatingShader.render();
            this.timestep += 1;
            [this.simulatingShader.sampler2dTexture, this.renderingShader.sampler2dTexture, this.simulatingShader.framebuffer, this.renderingShader.framebuffer] =
                [this.renderingShader.sampler2dTexture, this.simulatingShader.sampler2dTexture, this.renderingShader.framebuffer, this.simulatingShader.framebuffer];
        }
        [this.simulatingShader.sampler2dTexture, this.renderingShader.sampler2dTexture, this.simulatingShader.framebuffer, this.renderingShader.framebuffer] =
            [this.renderingShader.sampler2dTexture, this.simulatingShader.sampler2dTexture, this.renderingShader.framebuffer, this.simulatingShader.framebuffer];

        this.renderingShader.render();

        // [ this.texture1, this.texture2, this.framebuffer1, this.framebuffer2 ] =
        //     [ this.texture2, this.texture1, this.framebuffer2, this.framebuffer1 ];

        [ this.simulatingShader.sampler2dTexture, this.renderingShader.sampler2dTexture, this.simulatingShader.framebuffer, this.renderingShader.framebuffer ] =
            [ this.renderingShader.sampler2dTexture, this.simulatingShader.sampler2dTexture, this.renderingShader.framebuffer, this.simulatingShader.framebuffer ];
    }
}
