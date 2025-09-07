export namespace main {
	
	export class OSInfoResult {
	    platform: string;
	
	    static createFrom(source: any = {}) {
	        return new OSInfoResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.platform = source["platform"];
	    }
	}

}

