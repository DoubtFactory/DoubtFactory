const CLOUD_NAME = "hbvemwxf";
const UPLOAD_PRESET = "doubtfactory";

export function uploadImage(callback) {

    const widget = cloudinary.createUploadWidget({

        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local"],
        multiple: false,
        cropping: false,
        folder: "questions"

    }, (error, result) => {

        if (!error &&
            result &&
            result.event === "success") {

            callback(result.info.secure_url);

        }

    });

    widget.open();

}