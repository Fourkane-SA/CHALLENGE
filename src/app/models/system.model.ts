import { ChallengeService } from '../services/challenge.service';
import { Asset } from './asset.model';

export class System {
  public id: string;
  public name: string;
  public environment_id: string; //id de l'environnement
  public parent_id: string; //id du system parent
  constructor(private service: ChallengeService) { }

  deserialize(input: any): this {
    Object.assign(this, input);
    return this;
  }

  // Récupère les systemes enfants
  get systems(): System[] {
    return this.service.getSystems.filter(system => system.parent_id === this.id);
  }

  //TODO: Rendre la fonction récursive (elle ne récupère que les assets direct, mais pas les assets des systemes enfants)
  get recursiveAssets(): Asset[] {
    let assets = [];
    let systChild = this.systems.filter(syst => syst.parent_id == this.id);
    systChild.forEach(syst => this.service.getAssets.filter(asset => asset.system_ids.includes(syst.id)).forEach(asset => assets.push(asset)));
    this.service.getAssets.filter(asset => asset.system_ids.includes(this.id)).forEach(asset => assets.push(asset));
    return assets;
  }
}