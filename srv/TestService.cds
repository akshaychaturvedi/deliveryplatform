using {
    ey.ct.sap.Parent as Parent,
    ey.ct.sap.Child as Child,
    ey.ct.sap.Engagements as Engagements,
    ey.ct.sap.Proposals as Proposals,
    ey.ct.sap.Phases as Phases,
    ey.ct.sap.Deliverables as Deliverables,
    ey.ct.sap.Activities as Activities,
    ey.ct.sap.Tools as Tools,
    ey.ct.sap.Users as Users,
    ey.ct.sap.master as Master
} from '../db/data-model';

service DeliveryPlatformService {

    // Engagements
    entity ParentData          as projection on Parent;
    entity ChildData           as projection on Child;
    entity EngagementsData     as projection on Engagements;
    entity ProposalsData       as projection on Proposals;
    entity PhasesData          as projection on Phases;
    entity DeliverablesData    as projection on Deliverables;
    entity ActivitiesData      as projection on Activities;
    entity ToolsData           as projection on Tools;
    entity UsersData           as projection on Users;
    // Master Data
    entity PhaseCatalog        as projection on Master.Phases;
    entity DeliverablesCatalog as projection on Master.Deliverables;
    entity ActivitiesCatalog   as projection on Master.Activities;
    entity ToolsCatalog        as projection on Master.Tools;
    // Actions
    action UpdateEngagementDetails(engagementID : UUID) returns String;
    action ConfirmPhase(engagementID : UUID)            returns String;
}
