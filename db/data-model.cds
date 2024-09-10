namespace ey.ct.sap;

using {
    cuid,
    managed
} from '@sap/cds/common';

context master {

    // Draft, Active, Completed, Awaiting
    entity Status : cuid {
        phase : String;
    }

    entity Country : cuid {
        country : String;
    }

    // Discover, etc
    entity Phases : cuid {
        rank         : Integer;
        phase        : String;
        deliverables : Composition of many Deliverables
                           on deliverables.phase = $self;
    }

    entity Deliverables : cuid, managed {
        deliverable : String;
        phase       : Association to Phases;
        activities  : Composition of many Activities
                          on activities.deliverable = $self;
        tools       : Composition of many Tools
                          on tools.deliverable = $self;
    }

    entity Activities : cuid, managed {
        activity    : String;
        deliverable : Association to Deliverables;
    }

    entity Tools : cuid, managed {
        tool        : String;
        deliverable : Association to Deliverables;
    }
}

entity Parent : cuid, managed {
    name     : String;
    type     : String;

    children : Composition of many Child
                   on children.parent = $self;
}

entity Child : cuid, managed {
    client : String;
    sector : String;
    parent : Association to Parent;
}

entity Engagements : cuid, managed {
    number           : String;
    name             : String;
    type             : String;
    status           : String enum {
        Draft    = 'Draft';
        Active   = 'Active';
        Closed   = 'Closed';
        Awaiting = 'Awaiting Closure';
    };
    country          : String;
    phase            : String;
    phaseStep        : String;
    serviceLine      : String default 'SAP';
    proposal         : Composition of one Proposals;
    phases           : Composition of many Phases
                           on phases.engagement = $self;
    provisionedTools : Association to many ProvisionedTools
                           on provisionedTools.engagement = $self;
    users            : Composition of many Users
                           on users.engagement = $self;
}

entity Proposals : cuid, managed {
    client           : String;
    sector           : String;
    region           : String;
    industry         : String;
    stage            : String;
    scope            : String;
    problemStatement : String;
    businessValue    : String;
// engagement       : Association to Engagements;
}

entity Phases : cuid, managed {
    rank         : Integer;
    phase        : String;
    isActive     : Boolean default False;
    isConfirmed  : Boolean default False;
    engagement   : Association to Engagements;
    deliverables : Composition of many Deliverables
                       on deliverables.phase = $self;

}

entity Deliverables : cuid, managed {
    deliverable : String;
    isSelected  : Boolean;
    phase       : Association to Phases;
    activities  : Composition of many Activities
                      on activities.deliverable = $self;
    tools       : Composition of many Tools
                      on tools.deliverable = $self;
}

entity Activities : cuid, managed {
    activity    : String;
    deliverable : Association to Deliverables;
}

entity Tools : cuid, managed {
    tool        : String;
    deliverable : Association to Deliverables;
}

entity Users : cuid, managed {
    user_name  : String;
    user_email : String;
    engagement : Association to Engagements;
}

entity ProvisionedTools : cuid {
    tool       : String;
    link       : String;
    engagement : Association to Engagements;
}
