import LevelDOWN from "leveldown";
import { join } from "path";

class Store {
	private db = new LevelDOWN(join(process.cwd(), "temp/store.db"));

	private get(key: string) {
		let value: string;
		this.db.get(key, (err, v) => {
			console.error(err);
			value = v.toString() ?? "";
		});
		return value;
	}

	private set(key: string, value: string) {
		this.db.put(key, value, (err) => console.error(err));
	}

	private delete(key: string) {
		this.db.del(key, (err) => console.error(err));
	}
}

export const store = new Store();