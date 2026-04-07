export namespace main {
	
	export class ServiceStatus {
	    name: string;
	    label: string;
	    port: number;
	    running: boolean;
	    healthy: boolean;
	    launchd: boolean;
	    pid?: number;
	    exitCode?: number;
	
	    static createFrom(source: any = {}) {
	        return new ServiceStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.label = source["label"];
	        this.port = source["port"];
	        this.running = source["running"];
	        this.healthy = source["healthy"];
	        this.launchd = source["launchd"];
	        this.pid = source["pid"];
	        this.exitCode = source["exitCode"];
	    }
	}

}

