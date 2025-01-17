
import { toast } from 'react-hot-toast';

const notifySuccess = (message:string) => {
    toast.success(message, {
        iconTheme: {
            primary: '#1F2937',
            secondary:'#1F2937'
        },
    });
};

const notifyError = (message:string) => {
    toast.error(message, {
        iconTheme: {
            primary: 'red',
            secondary:'red'
        },
    });
};

export {notifySuccess, notifyError}