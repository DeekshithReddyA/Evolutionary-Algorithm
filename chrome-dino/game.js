var Dino = /** @class */ (function () {
    // have to add image to this constructor
    function Dino() {
        this.x = 105;
        this.y = 250;
        this.width = 50;
        this.height = 50;
        this.image = new Image();
        this.image.src = "/public/dino.png";
    }
    Dino.prototype.draw = function (ctx) {
        var _this = this;
        this.image.onload = function () {
            ctx.drawImage(_this.image, _this.x, _this.y, _this.width, _this.height);
        };
    };
    return Dino;
}());
var canvas = document.getElementById("myCanvas") || null;
var ctx = canvas.getContext("2d");
if (ctx) {
    // ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(100, 300);
    ctx.lineTo(800, 300);
    // ctx.closePath();
    ctx.stroke();
    var dino1 = new Dino();
    dino1.draw(ctx);
}
