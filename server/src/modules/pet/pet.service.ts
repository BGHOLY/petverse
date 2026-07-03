import { Injectable } from "@nestjs/common";
import { Pet } from "./pet.entity";

@Injectable()

export class PetService{

    getAllPets():Pet[]{

        return [

            {

                id:1,

                ownerId:1,

                nickname:"Mochi",

                species:"Cat",

                rarity:3,

                level:1,

                exp:0,

                hp:100,

                attack:20,

                defense:15,

                agility:18,

                intelligence:20,

                hunger:100,

                happiness:100,

                cleanliness:100,

                stamina:100,

                geneCode:"AAAA",

                fatherId:0,

                motherId:0,

                married:false,

                partnerId:0,

                createTime:new Date()

            }

        ];

    }

}