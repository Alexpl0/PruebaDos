function loadImage(url) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onload = function(){
            const reader = new FileReader();
            reader.onload = function(event){
                const res = event.target.result;
                resolve(res);  
            };
            const file = this.response;
            reader.readAsDataURL(file);
        }
        xhr.send();
    });
}

window.addEventListener('load', async () => {
    const image = await loadImage('https://grammermx.com/Jesus/PruebaDos/assets/media/SPECIAL_FREIGHT_AUTHORIZATION.png');
});

