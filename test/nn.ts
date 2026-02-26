export class NeuralNetwork {
    layerSizes: number[];
    weights: number[][][];
    bias: number[][];
    constructor(layerSizes: number[]){
        this.layerSizes = [...layerSizes];
        this.weights = [];
        this.bias = [];
        this._initWeights();
    }

    _initWeights(): void {
        for(let i = 1; i < this.layerSizes.length; i++){
            const prevSize = this.layerSizes[i - 1];
            const currSize = this.layerSizes[i];
            const weight: number[][] = new Array(currSize);
            const b: number[] = new Array(currSize);

            for(let j = 0; j < currSize; j++){
                weight[j] = [];
                for(let k = 0; k < prevSize; k++){
                    weight[j][k] = Math.random() * 2 - 1;
                }
                b[j] = Math.random() * 2 - 1;
            }

            this.weights.push(weight);
            this.bias.push(b);
        }
    }
}

const nn = new NeuralNetwork([3,2,1]);