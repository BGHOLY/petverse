import ApiConfig from "./ApiConfig";

export default class NetworkManager {

    public static async post(
        url: string,
        data: any = {},
        token: string = "",
    ): Promise<any> {

        return new Promise((resolve, reject) => {

            const xhr = new XMLHttpRequest();

            xhr.open(
                "POST",
                ApiConfig.BASE_URL + url,
                true,
            );

            xhr.setRequestHeader(
                "Content-Type",
                "application/json",
            );

            if (token) {
                xhr.setRequestHeader(
                    "Authorization",
                    "Bearer " + token,
                );
            }

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    try {
                        const res =
                            JSON.parse(xhr.responseText);
                        resolve(res);
                    } catch (e) {
                        reject(e);
                    }
                }
            };

            xhr.send(
                JSON.stringify(data),
            );
        });
    }

    public static async get(
        url: string,
        token: string = "",
    ): Promise<any> {

        return new Promise((resolve, reject) => {

            const xhr = new XMLHttpRequest();

            xhr.open(
                "GET",
                ApiConfig.BASE_URL + url,
                true,
            );

            if (token) {
                xhr.setRequestHeader(
                    "Authorization",
                    "Bearer " + token,
                );
            }

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    try {
                        const res =
                            JSON.parse(xhr.responseText);
                        resolve(res);
                    } catch (e) {
                        reject(e);
                    }
                }
            };

            xhr.send();
        });
    }
}

