export function uploadImage() {
    return new Promise((resolve, reject) => {
        // Initialize the Cloudinary Widget
        const myWidget = window.cloudinary.createUploadWidget({
            cloudName: 'hbvemwxf',      // <-- Replace with your Cloudinary Cloud Name
            uploadPreset: 'doubtfactory',  // <-- Replace with your Cloudinary Upload Preset (Unsigned)
            sources: ['local', 'url', 'camera', 'image_search'],
            multiple: false,
            cropping: false,
            showAdvancedOptions: false,
            defaultSource: 'local',
        }, (error, result) => {
            // Listen for the successful upload event
            if (!error && result && result.event === "success") {
                console.log("Image uploaded successfully: ", result.info.secure_url);
                resolve(result.info.secure_url);
            } 
            else if (error) {
                console.error("Cloudinary Widget Error:", error);
                reject(error);
            }
        });

        // Open the widget
        myWidget.open();

        // Handle the case where the user closes the widget without uploading
        const iframe = document.querySelector('iframe.cloudinary_fileupload');
        if (iframe) {
            // Cloudinary creates an iframe. We can track if it closes.
            const closeListener = setInterval(() => {
                if (document.querySelector('iframe.cloudinary_fileupload') === null) {
                    clearInterval(closeListener);
                    resolve(null); // Resolve with null to reset the button text to "Upload Image"
                }
            }, 500);
        }
    });
}
