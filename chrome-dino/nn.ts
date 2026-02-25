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

    _RELU(x: number): number{
        return Math.max(0, x);
    }

    _argmax(outputs: number[]){
        let maxi = -1e9;
        let maxIndex = 0;
        for(let i = 0; i < outputs.length; i++){
            if(outputs[i] > maxi){
                maxi = outputs[i];
                maxIndex = i;
            }
        }

        return maxIndex;
    }

    feedforward(inputs: number[]): number[]{
        let x = inputs;

        for(let L = 0; L < this.layerSizes.length - 1; L++){
            const W = this.weights[L];
            const B = this.bias[L];
            
            const next: number[] = new Array(W.length);

            for(let i = 0; i < W.length; i++){
                let z = B[i];

                const w = W[i];

                for(let k = 0; k < w.length; k++){
                    z += w[k] * x[k];
                }
                
                if(L === this.layerSizes.length - 2)
                    next[i] = z;
                else
                    next[i] = this._RELU(z);
            }

            x = next;
        }

        return x;
    }

    clone(){
        //deep copy
        const cloneNN = new NeuralNetwork(this.layerSizes);
        for(let i = 0; i < this.weights.length; i++){
            for(let j = 0; j < this.weights[i].length; j++){
                for(let k = 0; k < this.weights[i][j].length; k++){
                    cloneNN.weights[i][j][k] = this.weights[i][j][k];
                }
            }
        }

        for(let i = 0; i < this.bias.length; i++){
            for(let j = 0; j < this.bias[i].length; j++){
                cloneNN.bias[i][j] = this.bias[i][j];
            }
        }

        return cloneNN;
    }

    mutate(rate: number, strength: number): void {
        for(let i = 0; i < this.weights.length; i++){
            for(let j = 0; j < this.weights[i].length; j++){
                for(let k = 0; k < this.weights[i][j].length; k++){
                    if(Math.random() < rate){
                        this.weights[i][j][k] += (Math.random() * 2 - 1) * strength;
                    }
                }
            }
        }

        for(let i = 0; i < this.bias.length; i++){
            for(let j = 0; j < this.bias[i].length; j++){
                if(Math.random() < rate){
                    this.bias[i][j] += (Math.random() * 2 - 1) * strength;
                }
            }
        }
    }

    toJson(): string { 
        return JSON.stringify(
            {
            layerSizes: this.layerSizes,
            weights: this.weights,
            bias: this.bias
        });
    }

    static fromJson(json: string): NeuralNetwork {
        const data = JSON.parse(json);
        const nn = new NeuralNetwork(data.layerSizes);
        nn.weights = data.weights;
        nn.bias = data.bias;
        return nn;
    }
}
